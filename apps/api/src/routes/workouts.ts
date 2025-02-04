import { Router } from 'express';
import { PrismaClient, Workout } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const workoutSchema = z.object({
  name: z.string(),
  category: z.enum(['Push', 'Pull', 'Legs', 'Upper', 'Lower']),
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.number(),
    reps: z.number(),
    weight: z.number(),
    notes: z.string().optional()
  })),
  schedule: z.object({
    type: z.enum(['weekly', 'daily']),
    days: z.array(z.number()),
    frequency: z.number()
  })
});

const parseWorkoutScheduleDays = (workout: Workout & { exercises?: any }) => ({
  ...workout,
  days: workout.scheduleDays.split(',').map(day => parseInt(day)),
  type: workout.scheduleType,
  frequency: workout.frequency
});

// Get all workouts for the authenticated user
router.get('/', async (req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      where: { userId: req.user!.id },
      include: { exercises: true }
    });

    res.json(workouts.map(parseWorkoutScheduleDays));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Get workout for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Find workout scheduled for this day
    const workout = await prisma.workout.findFirst({
      where: {
        userId: req.user!.id,
        OR: [
          { scheduleType: 'daily' },
          {
            AND: [
              { scheduleType: 'weekly' },
              { scheduleDays: { contains: dayOfWeek.toString() } }
            ]
          }
        ]
      },
      include: { exercises: true }
    });

    if (!workout) {
      return res.json({
        date,
        category: 'Rest',
        exercises: []
      });
    }

    res.json({
      date,
      category: workout.category,
      exercises: workout.exercises
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout for date' });
  }
});

// Create a new workout
router.post('/', async (req, res) => {
  try {
    const workoutData = workoutSchema.parse(req.body);
    
    const workout = await prisma.workout.create({
      data: {
        name: workoutData.name,
        category: workoutData.category,
        userId: req.user!.id,
        scheduleType: workoutData.schedule.type,
        scheduleDays: workoutData.schedule.days.join(','),
        frequency: workoutData.schedule.frequency,
        exercises: {
          create: workoutData.exercises
        }
      },
      include: { exercises: true }
    });

    res.json(parseWorkoutScheduleDays(workout));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// Log a workout session
router.post('/:id/log', async (req, res) => {
  try {
    const { id } = req.params;
    const { exercises } = req.body;

    const workoutLog = await prisma.workoutLog.create({
      data: {
        userId: req.user!.id,
        workoutId: parseInt(id),
        date: new Date(),
        exercises: exercises
      }
    });

    res.json(workoutLog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// Get workout logs for a specific workout
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await prisma.workoutLog.findMany({
      where: {
        workoutId: parseInt(id),
        userId: req.user!.id
      },
      orderBy: { date: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout logs' });
  }
});

// Delete a workout
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First delete all exercises associated with this workout
    await prisma.exercise.deleteMany({
      where: { workoutId: parseInt(id) }
    });

    // Then delete the workout itself
    await prisma.workout.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Get workouts for a specific week
router.get('/week', async (req, res) => {
  try {
    const date = new Date(req.query.date as string);
    const workouts = await prisma.workout.findMany({
      where: { userId: req.user!.id },
      include: { exercises: true, logs: true }
    });
    res.json(workouts.map(parseWorkoutScheduleDays));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Get workouts for a week starting from a specific date
router.get('/week/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Please use YYYY-MM-DD format.' 
      });
    }

    const startDate = new Date(date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date. Please provide a valid date.' 
      });
    }

    // Ensure the date is set to midnight UTC to avoid timezone issues
    startDate.setUTCHours(0, 0, 0, 0);
    const weekWorkouts = [];

    // Get workouts for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dayOfWeek = currentDate.getDay();

      // Find workout scheduled for this day
      const workout = await prisma.workout.findFirst({
        where: {
          userId: req.user!.id,
          OR: [
            { scheduleType: 'daily' },
            {
              AND: [
                { scheduleType: 'weekly' },
                { scheduleDays: { contains: dayOfWeek.toString() } }
              ]
            }
          ]
        },
        include: { exercises: true, logs: true }
      });

      // Always push a day entry, even if there's no workout
      weekWorkouts.push({
        id: workout?.id || null,
        date: currentDate.toISOString().split('T')[0],
        category: workout?.category || 'Rest',
        exercises: workout?.exercises || []
      });
    }

    res.json(weekWorkouts);
  } catch (error) {
    console.error('Error fetching weekly workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts for week' });
  }
});

// Get workout logs for a specific date
router.get('/logs', async (req, res) => {
  try {
    const date = new Date(req.query.date as string);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const logs = await prisma.workoutLog.findMany({
      where: {
        userId: req.user!.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout logs' });
  }
});

// Get workout logs for a specific date
router.get('/logs/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Please use YYYY-MM-DD format.' 
      });
    }

    const targetDate = new Date(date);
    // Set time to start of day
    targetDate.setHours(0, 0, 0, 0);
    
    // Set time to end of day for comparison
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const logs = await prisma.workoutLog.findMany({
      where: {
        userId: req.user!.id,
        date: {
          gte: targetDate,
          lte: endDate
        }
      },
      include: {
        workout: {
          select: {
            name: true,
            category: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching workout logs:', error);
    res.status(500).json({ error: 'Failed to fetch workout logs' });
  }
});

// Log a workout
router.post('/logs', async (req, res) => {
  try {
    const { date, exercises, workoutId } = req.body;

    if (!date || !exercises || !workoutId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create workout log
    const workoutLog = await prisma.workoutLog.create({
      data: {
        date: new Date(date),
        userId: req.user!.id,
        workoutId: parseInt(workoutId),
        exercises: exercises // Store exercises directly as JSON
      },
      include: {
        workout: true,
        user: true
      }
    });

    res.json(workoutLog);
  } catch (error) {
    console.error('Error logging workout:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

export { router as workoutRouter };
