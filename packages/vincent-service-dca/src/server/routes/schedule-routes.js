// Schedule routes module
import { Schedule } from '../models/schedule.js';

// For the auth middleware, we'll need to dynamically import it since it's a CommonJS module
async function getAuthMiddleware() {
  try {
    const authModule = await import('../../middleware/auth.cjs');
    return authModule.verifyJwtMiddleware;
  } catch (error) {
    console.error('Error importing auth middleware:', error);
    // Return a dummy middleware that does nothing if we can't import the real one
    return (request, reply, done) => done();
  }
}

export default async function scheduleRoutes(fastify, options) {
  // Get the auth middleware
  const verifyJwtMiddleware = await getAuthMiddleware();

  // Get all DCA schedules
  fastify.get('/', async () => {
    return await Schedule.find()
      .sort({ registeredAt: -1 }) // Sort by registration date, newest first
      .lean();
  });

  // Get DCA schedules by wallet address
  fastify.get('/:walletAddress', async (request, reply) => {
    const { walletAddress } = request.params;
    
    // Only fetch the most recent schedule for this wallet address
    const schedule = await Schedule.findOne({ walletAddress })
      .sort({ registeredAt: -1 }) // Sort by registration date, newest first
      .lean();

    if (!schedule) {
      reply.code(404).send({
        message: `No DCA schedules found for wallet address ${walletAddress}`,
      });
      return;
    }

    // Return as an array with a single item for backward compatibility with frontend
    return [schedule];
  });

  // Get DCA schedule by ID
  fastify.get('/id/:scheduleId', async (request, reply) => {
    const { scheduleId } = request.params;
    const schedule = await Schedule.findOne({ _id: scheduleId }).lean();

    if (!schedule) {
      reply.code(404).send({
        message: `No DCA schedule found with ID ${scheduleId}`,
      });
      return;
    }

    return schedule;
  });

  // Create new DCA schedule
  fastify.post('/', { preHandler: verifyJwtMiddleware }, async (request, reply) => {
    try {
      const scheduleData = request.body;
      
      // Validate wallet address format
      if (!scheduleData.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(scheduleData.walletAddress)) {
        return reply.code(400).send({
          message: 'Invalid wallet address format',
        });
      }

      // Normalize the wallet address to lowercase
      const normalizedWalletAddress = scheduleData.walletAddress.toLowerCase();
      scheduleData.walletAddress = normalizedWalletAddress;

      // Log the request
      console.log(`Creating new DCA schedule for wallet ${normalizedWalletAddress}`);
      
      // Check if there's an existing schedule for this wallet address
      const existingSchedule = await Schedule.findOne({ 
        walletAddress: normalizedWalletAddress 
      });
      
      if (existingSchedule) {
        console.log(`Found existing DCA schedule for wallet ${normalizedWalletAddress}, replacing it`);
        
        // Delete the existing schedule
        try {
          await Schedule.deleteOne({ _id: existingSchedule._id });
          console.log(`Deleted existing DCA schedule with ID ${existingSchedule._id} for wallet ${normalizedWalletAddress}`);
        } catch (deleteError) {
          console.error(`Error deleting existing schedule: ${deleteError}`);
          // Continue with creating a new schedule even if deletion fails
        }
      } else {
        // If no existing schedule was found, delete any potential duplicates (just to be safe)
        try {
          const deleteResult = await Schedule.deleteMany({
            walletAddress: normalizedWalletAddress
          });
          
          if (deleteResult.deletedCount > 0) {
            console.log(`Deleted ${deleteResult.deletedCount} existing DCA schedule(s) for wallet ${normalizedWalletAddress}`);
          }
        } catch (deleteError) {
          console.error(`Error deleting existing schedules: ${deleteError}`);
          // Continue with creating a new schedule even if deletion fails
        }
      }

      // Create a new schedule
      const schedule = new Schedule({
        ...scheduleData,
        active: true,
        registeredAt: new Date(),
      });
      
      await schedule.save();
      
      console.log(`Successfully created new DCA schedule for wallet ${normalizedWalletAddress}`);
      reply.code(201).send(schedule);
    } catch (error) {
      console.error(`Error creating DCA schedule: ${error}`);
      reply.code(500).send({
        message: 'Failed to create DCA schedule',
        error: error.message,
      });
    }
  });

  // Deactivate DCA schedule
  fastify.patch(
    '/:scheduleId/deactivate',
    { preHandler: verifyJwtMiddleware },
    async (request, reply) => {
      const { scheduleId } = request.params;

      const result = await Schedule.findOneAndUpdate(
        { _id: scheduleId },
        { active: false },
        {
          new: true,
          lean: true
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
    '/:scheduleId/activate',
    { preHandler: verifyJwtMiddleware },
    async (request, reply) => {
      const { scheduleId } = request.params;

      const result = await Schedule.findOneAndUpdate(
        { _id: scheduleId },
        { active: true },
        {
          new: true,
          lean: true
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
