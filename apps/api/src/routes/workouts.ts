import { Router } from 'express';
import { PrismaClient, Workout } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const workoutSchema = z.object({
  name: z.string(),
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

// Create a new workout
router.post('/', async (req, res) => {
  try {
    const workoutData = workoutSchema.parse(req.body);
    
    const workout = await prisma.workout.create({
      data: {
        name: workoutData.name,
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
    const workoutId = parseInt(id);

    // Check if workout exists and belongs to user
    const workout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        userId: req.user!.id
      }
    });

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Delete the workout and all related data
    await prisma.$transaction([
      prisma.workoutLog.deleteMany({
        where: { workoutId }
      }),
      prisma.exercise.deleteMany({
        where: { workoutId }
      }),
      prisma.workout.delete({
        where: { id: workoutId }
      })
    ]);

    res.status(200).json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Get workouts for a specific week
router.get('/week', async (req, res) => {
  try {
    const date = new Date(req.query.date as string);
    const workouts = await prisma.workout.findMany({
      where: { userId: req.user!.id },
      include: { exercises: true }
    });
    res.json(workouts.map(parseWorkoutScheduleDays));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
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

export { router as workoutRouter };
