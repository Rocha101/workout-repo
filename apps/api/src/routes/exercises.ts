import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const exerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.number(),
  weight: z.number(),
  notes: z.string().optional()
});

// Update exercise
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const exerciseData = exerciseSchema.parse(req.body);

    // Verify exercise belongs to user's workout
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: parseInt(id),
        workout: {
          userId: req.user!.id
        }
      }
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const updatedExercise = await prisma.exercise.update({
      where: { id: parseInt(id) },
      data: exerciseData
    });

    res.json(updatedExercise);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// Delete exercise
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify exercise belongs to user's workout
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: parseInt(id),
        workout: {
          userId: req.user!.id
        }
      }
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    await prisma.exercise.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

export { router as exerciseRouter };
