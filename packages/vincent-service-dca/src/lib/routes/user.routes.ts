import { type FastifyInstance } from 'fastify';

import { User } from '../models/user.model';

export async function userRoutes(fastify: FastifyInstance) {
  // Get all DCA schedules
  fastify.get('/dca/schedules', async () => {
    return await User.find().select(
      'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );
  });

  // Get all DCA schedules for a wallet address
  fastify.get('/dca/schedules/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };
    const schedules = await User.find({ walletAddress }).select(
      'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );

    if (!schedules || schedules.length === 0) {
      reply.code(404).send({ error: 'No DCA schedules found for this wallet' });
      return;
    }

    return schedules;
  });

  // Get a specific DCA schedule by ID
  fastify.get('/dca/schedules/id/:scheduleId', async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    const schedule = await User.findOne({ scheduleId }).select(
      'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );

    if (!schedule) {
      reply.code(404).send({ error: 'DCA schedule not found' });
      return;
    }

    return schedule;
  });

  // Create new DCA schedule
  fastify.post('/dca/schedules', async (request, reply) => {
    const userData = request.body as {
      walletAddress: string;
      purchaseIntervalSeconds: number;
      purchaseAmount: string;
    };

    try {
      const user = new User({
        ...userData,
        active: true,
      });
      await user.save();
      reply.code(201).send(user.toObject());
    } catch (error) {
      reply.code(400).send({ error: 'Invalid DCA schedule data' });
    }
  });

  // Activate DCA schedule
  fastify.patch(
    '/dca/schedules/:scheduleId/activate',
    async (request, reply) => {
      const { scheduleId } = request.params as { scheduleId: string };

      const result = await User.findOneAndUpdate(
        { scheduleId },
        { active: true },
        { new: true }
      ).select(
        'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
      );

      if (!result) {
        reply.code(404).send({ error: 'DCA schedule not found' });
        return;
      }

      return result;
    }
  );

  // Deactivate DCA schedule
  fastify.patch(
    '/dca/schedules/:scheduleId/deactivate',
    async (request, reply) => {
      const { scheduleId } = request.params as { scheduleId: string };

      const result = await User.findOneAndUpdate(
        { scheduleId },
        { active: false },
        { new: true }
      ).select(
        'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
      );

      if (!result) {
        reply.code(404).send({ error: 'DCA schedule not found' });
        return;
      }

      return result;
    }
  );
}
