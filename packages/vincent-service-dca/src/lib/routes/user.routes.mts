import { type FastifyInstance } from 'fastify';
import { User } from '../models/user.model.mjs';

export async function userRoutes(fastify: FastifyInstance) {
  // Get all DCA schedules
  fastify.get('/dca/schedules', async () => {
    return await User.find().select(
      'walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );
  });

  // Get DCA schedule by wallet address
  fastify.get('/dca/schedules/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params as { walletAddress: string };
    const user = await User.findOne({ walletAddress }).select(
      'walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
    );

    if (!user) {
      reply.code(404).send({ error: 'DCA schedule not found' });
      return;
    }

    return user;
  });

  // Register new DCA schedule
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
      reply.code(201).send(user);
    } catch (error) {
      reply.code(400).send({ error: 'Invalid DCA schedule data' });
    }
  });

  // Deactivate DCA schedule
  fastify.patch(
    '/dca/schedules/:walletAddress/deactivate',
    async (request, reply) => {
      const { walletAddress } = request.params as { walletAddress: string };

      const result = await User.findOneAndUpdate(
        { walletAddress },
        { active: false },
        { new: true }
      ).select(
        'walletAddress purchaseIntervalSeconds purchaseAmount active registeredAt'
      );

      if (!result) {
        reply.code(404).send({ error: 'DCA schedule not found' });
        return;
      }

      return result;
    }
  );
}
