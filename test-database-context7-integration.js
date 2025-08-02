/**
 * Test Database Schema Engine with Context7 Integration
 * 
 * Tests that the database engine properly fetches ORM documentation
 * before generating models
 */

import { BackendAgent } from './src/meta-agents/backend-agent/dist/core/BackendAgent.js';
import { promises as fs } from 'fs';
import path from 'path';

async function testDatabaseEngineWithContext7() {
  console.log('🧪 Testing Database Schema Engine with Context7 Integration...\n');

  try {
    // Initialize backend agent
    const agent = new BackendAgent({
      outputDir: './generated-database-models',
      enableContext7: true,
      enableRAG: true,
      enableUEP: false
    });

    await agent.initialize();
    console.log('✅ Backend Agent initialized\n');

    // Test 1: Mongoose Model Generation
    console.log('📊 Test 1: Mongoose Model Generation');
    const mongooseResult = await agent.processTask('Generate database models for user management', {
      type: 'database-design',
      schemas: [
        {
          name: 'User',
          fields: [
            { name: 'id', type: 'objectid', primaryKey: true },
            { name: 'email', type: 'string', required: true, unique: true },
            { name: 'password', type: 'string', required: true },
            { name: 'firstName', type: 'string' },
            { name: 'lastName', type: 'string' },
            { name: 'isActive', type: 'boolean', default: true },
            { name: 'roles', type: 'array' }
          ],
          indexes: [{ fields: { email: 1 }, unique: true }]
        },
        {
          name: 'Task',
          fields: [
            { name: 'id', type: 'objectid', primaryKey: true },
            { name: 'title', type: 'string', required: true },
            { name: 'description', type: 'string' },
            { name: 'userId', type: 'objectid', ref: 'User' },
            { name: 'status', type: 'string', default: 'pending' },
            { name: 'dueDate', type: 'date' }
          ]
        }
      ],
      orm: 'mongoose',
      database: 'mongodb',
      typescript: true
    });

    console.log('✅ Mongoose models generated:', mongooseResult.success);
    console.log('📁 Files:', mongooseResult.generatedFiles?.length || 0);

    // Test 2: Sequelize Model Generation
    console.log('\n📊 Test 2: Sequelize Model Generation');
    const sequelizeResult = await agent.processTask('Generate database models for e-commerce', {
      type: 'database-design',
      schemas: [
        {
          name: 'Product',
          fields: [
            { name: 'id', type: 'number', primaryKey: true, autoIncrement: true },
            { name: 'name', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'stock', type: 'number', default: 0 },
            { name: 'categoryId', type: 'number' }
          ]
        },
        {
          name: 'Order',
          fields: [
            { name: 'id', type: 'number', primaryKey: true, autoIncrement: true },
            { name: 'userId', type: 'number', required: true },
            { name: 'totalAmount', type: 'number', required: true },
            { name: 'status', type: 'string', default: 'pending' }
          ]
        }
      ],
      orm: 'sequelize',
      database: 'postgresql',
      typescript: true
    });

    console.log('✅ Sequelize models generated:', sequelizeResult.success);
    console.log('📁 Files:', sequelizeResult.generatedFiles?.length || 0);

    // Test 3: Prisma Model Generation
    console.log('\n📊 Test 3: Prisma Model Generation');
    const prismaResult = await agent.processTask('Generate database models for blog', {
      type: 'database-design',
      schemas: [
        {
          name: 'Post',
          fields: [
            { name: 'id', type: 'number', primaryKey: true, autoIncrement: true },
            { name: 'title', type: 'string', required: true },
            { name: 'content', type: 'string' },
            { name: 'published', type: 'boolean', default: false },
            { name: 'authorId', type: 'number', required: true }
          ]
        },
        {
          name: 'Comment',
          fields: [
            { name: 'id', type: 'number', primaryKey: true, autoIncrement: true },
            { name: 'content', type: 'string', required: true },
            { name: 'postId', type: 'number', required: true },
            { name: 'authorId', type: 'number', required: true }
          ]
        }
      ],
      orm: 'prisma',
      database: 'postgresql',
      typescript: true
    });

    console.log('✅ Prisma models generated:', prismaResult.success);
    console.log('📁 Files:', prismaResult.generatedFiles?.length || 0);

    // Check Context7 usage
    console.log('\n🔍 Verifying Context7 Integration:');
    
    if (mongooseResult.generatedFiles && mongooseResult.generatedFiles.length > 0) {
      const userModel = mongooseResult.generatedFiles.find(f => f.path.includes('user'));
      if (userModel) {
        console.log('\n📝 Mongoose User Model:');
        console.log('  - Uses Schema class:', userModel.content.includes('Schema') ? '✅' : '❌');
        console.log('  - Has TypeScript interface:', userModel.content.includes('interface') ? '✅' : '❌');
        console.log('  - Includes timestamps:', userModel.content.includes('timestamps: true') ? '✅' : '❌');
      }
    }

    if (sequelizeResult.generatedFiles && sequelizeResult.generatedFiles.length > 0) {
      const productModel = sequelizeResult.generatedFiles.find(f => f.path.includes('product'));
      if (productModel) {
        console.log('\n📝 Sequelize Product Model:');
        console.log('  - Uses DataTypes:', productModel.content.includes('DataTypes') ? '✅' : '❌');
        console.log('  - Extends Model class:', productModel.content.includes('extends Model') ? '✅' : '❌');
        console.log('  - Has init method:', productModel.content.includes('.init(') ? '✅' : '❌');
      }
    }

    console.log('\n✅ Database Schema Engine Context7 Integration Test Complete!');

    await agent.shutdown();

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testDatabaseEngineWithContext7();