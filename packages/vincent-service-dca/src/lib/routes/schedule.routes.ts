import type { FastifyInstance } from 'fastify';
import { Schedule } from '../models/schedule.model';

export async function scheduleRoutes(fastify: FastifyInstance) {
  // Get all DCA schedules
  fastify.get('/dca/schedules', async () => {
    return await Schedule.find().select(
      'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );
  });

  // Get DCA schedules by wallet address
  fastify.get('/dca/schedules/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };
    const schedules = await Schedule.find({ walletAddress }).select(
      'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );

    if (!schedules || schedules.length === 0) {
      reply.code(404).send({
        message: `No DCA schedules found for wallet address ${walletAddress}`,
      });
      return;
    }

    return schedules;
  });

  // Get DCA schedule by ID
  fastify.get('/dca/schedules/id/:scheduleId', async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    const schedule = await Schedule.findOne({ scheduleId }).select(
      'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );

    if (!schedule) {
      reply.code(404).send({
        message: `No DCA schedule found with ID ${scheduleId}`,
      });
      return;
    }

    return schedule;
  });

  // Create new DCA schedule
  fastify.post('/dca/schedules', async (request, reply) => {
    const scheduleData = request.body as {
      walletAddress: string;
      purchaseIntervalSeconds: number;
      purchaseAmount: string;
    };

    const schedule = new Schedule({
      ...scheduleData,
      registeredAt: new Date(),
    });

    await schedule.save();
    reply.code(201).send(schedule.toObject());
  });

  // Deactivate DCA schedule
  fastify.patch(
    '/dca/schedules/:scheduleId/deactivate',
    async (request, reply) => {
      const { scheduleId } = request.params as { scheduleId: string };

      const result = await Schedule.findOneAndUpdate(
        { scheduleId },
        { active: false },
        {
          new: true,
          select:
            'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt',
        }
      );

      if (!result) {
        reply.code(404).send({
          message: `No DCA schedule found with ID ${scheduleId}`,
        });
        return;
      }

      return result;
    }
  );

  // Activate DCA schedule
  fastify.patch(
    '/dca/schedules/:scheduleId/activate',
    async (request, reply) => {
      const { scheduleId } = request.params as { scheduleId: string };

      const result = await Schedule.findOneAndUpdate(
        { scheduleId },
        { active: true },
        {
          new: true,
          select:
            'scheduleId walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt',
        }
      );

      if (!result) {
        reply.code(404).send({
          message: `No DCA schedule found with ID ${scheduleId}`,
        });
        return;
      }

      return result;
    }
  );
}
