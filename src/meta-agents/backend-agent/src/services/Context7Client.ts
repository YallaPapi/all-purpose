/**
 * Context7 Client Service
 * 
 * Provides library documentation lookup using Context7 MCP server
 * Enables agents to fetch real-time library documentation before code generation
 */

import { Logger } from 'winston';

export interface LibraryMatch {
  title: string;
  libraryId: string;
  description: string;
  codeSnippets: number;
  trustScore: number;
  versions?: string[];
}

export interface CodeSnippet {
  title: string;
  description: string;
  source: string;
  language: string;
  code: string;
}

export interface LibraryDocs {
  snippets: CodeSnippet[];
  libraryId: string;
  topic?: string;
}

/**
 * Context7 Client for fetching library documentation
 */
export class Context7Client {
  private logger: Logger;
  private cache = new Map<string, LibraryDocs>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Resolve a library name to Context7 library ID
   */
  async resolveLibraryId(libraryName: string): Promise<LibraryMatch | null> {
    try {
      this.logger.info(`🔍 Resolving library ID for: ${libraryName}`);

      // Note: In a real implementation, this would call:
      // const result = await mcp__context7__resolve_library_id({ libraryName });
      // For now, we'll simulate the response
      const mockLibraries: Record<string, LibraryMatch> = {
        'express': {
          title: 'Express',
          libraryId: '/expressjs/express',
          description: 'Fast, unopinionated, minimalist web framework for node.',
          codeSnippets: 60,
          trustScore: 9,
          versions: ['v5.1.0']
        },
        'jsonwebtoken': {
          title: 'jsonwebtoken',
          libraryId: '/auth0/node-jsonwebtoken',
          description: 'JSON Web Token implementation for Node.js',
          codeSnippets: 45,
          trustScore: 8.5
        },
        'joi': {
          title: 'Joi',
          libraryId: '/hapijs/joi',
          description: 'The most powerful data validation library for JS',
          codeSnippets: 120,
          trustScore: 9.2
        },
        'bcrypt': {
          title: 'bcrypt',
          libraryId: '/kelektiv/node.bcrypt.js',
          description: 'A library to help you hash passwords',
          codeSnippets: 25,
          trustScore: 8.8
        },
        'mongoose': {
          title: 'Mongoose',
          libraryId: '/automattic/mongoose',
          description: 'MongoDB object modeling designed to work in an asynchronous environment',
          codeSnippets: 200,
          trustScore: 9.1
        },
        'sequelize': {
          title: 'Sequelize',
          libraryId: '/sequelize/sequelize',
          description: 'Feature-rich ORM for modern TypeScript and JavaScript',
          codeSnippets: 180,
          trustScore: 8.9
        },
        'prisma': {
          title: 'Prisma',
          libraryId: '/prisma/prisma',
          description: 'Next-generation ORM for Node.js and TypeScript',
          codeSnippets: 250,
          trustScore: 9.3
        }
      };

      const normalizedName = libraryName.toLowerCase();
      const match = mockLibraries[normalizedName];

      if (match) {
        this.logger.info(`✅ Found library match: ${match.libraryId}`);
        return match;
      }

      this.logger.warn(`⚠️ No exact match found for library: ${libraryName}`);
      return null;

    } catch (error) {
      this.logger.error(`❌ Failed to resolve library ID`, { error });
      return null;
    }
  }

  /**
   * Get documentation for a specific library
   */
  async getLibraryDocs(
    libraryId: string,
    topic?: string,
    maxTokens: number = 5000
  ): Promise<LibraryDocs | null> {
    try {
      // Check cache first
      const cacheKey = `${libraryId}:${topic || 'general'}`;
      if (this.cache.has(cacheKey)) {
        this.logger.info(`📋 Using cached docs for: ${cacheKey}`);
        return this.cache.get(cacheKey)!;
      }

      this.logger.info(`📚 Fetching library docs for: ${libraryId}`, { topic, maxTokens });

      // Note: In a real implementation, this would call:
      // const result = await mcp__context7__get_library_docs({
      //   context7CompatibleLibraryID: libraryId,
      //   topic,
      //   tokens: maxTokens
      // });
      // For now, we'll return mock documentation
      const docs = await this.getMockDocs(libraryId, topic);

      if (docs) {
        // Cache the results
        this.cache.set(cacheKey, docs);
        this.logger.info(`✅ Retrieved ${docs.snippets.length} code snippets`);
      }

      return docs;

    } catch (error) {
      this.logger.error(`❌ Failed to fetch library docs`, { error });
      return null;
    }
  }

  /**
   * Get documentation for multiple libraries
   */
  async getMultipleLibraryDocs(
    libraries: Array<{ name: string; topics?: string[] }>,
    maxTokensPerLibrary: number = 2000
  ): Promise<Map<string, LibraryDocs>> {
    const results = new Map<string, LibraryDocs>();

    for (const lib of libraries) {
      // First resolve the library ID
      const libraryMatch = await this.resolveLibraryId(lib.name);
      if (!libraryMatch) continue;

      // Then fetch docs for each topic
      if (lib.topics && lib.topics.length > 0) {
        for (const topic of lib.topics) {
          const docs = await this.getLibraryDocs(
            libraryMatch.libraryId,
            topic,
            maxTokensPerLibrary
          );
          if (docs) {
            results.set(`${lib.name}:${topic}`, docs);
          }
        }
      } else {
        // Fetch general docs
        const docs = await this.getLibraryDocs(
          libraryMatch.libraryId,
          undefined,
          maxTokensPerLibrary
        );
        if (docs) {
          results.set(lib.name, docs);
        }
      }
    }

    return results;
  }

  /**
   * Clear the documentation cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('🧹 Documentation cache cleared');
  }

  /**
   * Mock documentation provider (to be replaced with real MCP calls)
   */
  private async getMockDocs(libraryId: string, topic?: string): Promise<LibraryDocs | null> {
    // Simulate Express.js documentation
    if (libraryId === '/expressjs/express') {
      return {
        libraryId,
        topic,
        snippets: [
          {
            title: 'Basic Express Server',
            description: 'Create a basic Express.js web server with routing',
            source: 'express-docs',
            language: 'javascript',
            code: `import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(3000)`
          },
          {
            title: 'Express Middleware',
            description: 'Using middleware for request processing',
            source: 'express-docs',
            language: 'javascript',
            code: `app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Custom middleware
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.path}\`)
  next()
})`
          },
          {
            title: 'Express Route Parameters',
            description: 'Handle dynamic route parameters',
            source: 'express-docs',
            language: 'javascript',
            code: `app.get('/users/:id', (req, res) => {
  const userId = req.params.id
  res.json({ userId })
})

app.post('/users', (req, res) => {
  const userData = req.body
  res.status(201).json({ created: userData })
})`
          }
        ]
      };
    }

    // Simulate JWT documentation
    if (libraryId === '/auth0/node-jsonwebtoken') {
      return {
        libraryId,
        topic,
        snippets: [
          {
            title: 'JWT Sign and Verify',
            description: 'Create and verify JSON Web Tokens',
            source: 'jsonwebtoken-docs',
            language: 'javascript',
            code: `import jwt from 'jsonwebtoken'

// Sign a token
const token = jwt.sign(
  { userId: 123, email: 'user@example.com' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
)

// Verify a token
jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
  if (err) {
    console.error('Invalid token')
  } else {
    console.log('Decoded:', decoded)
  }
})`
          }
        ]
      };
    }

    // Simulate Mongoose documentation
    if (libraryId === '/automattic/mongoose') {
      return {
        libraryId,
        topic,
        snippets: [
          {
            title: 'Mongoose Schema Definition',
            description: 'Define a schema with validation and types',
            source: 'mongoose-docs',
            language: 'javascript',
            code: `import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Add indexes
userSchema.index({ email: 1 });

// Add methods
userSchema.methods.getDisplayName = function() {
  return this.name;
};

export const User = model('User', userSchema);`
          }
        ]
      };
    }

    // Simulate Sequelize documentation
    if (libraryId === '/sequelize/sequelize') {
      return {
        libraryId,
        topic,
        snippets: [
          {
            title: 'Sequelize Model Definition',
            description: 'Define a model with TypeScript',
            source: 'sequelize-docs',
            language: 'typescript',
            code: `import { DataTypes, Model } from 'sequelize';
import { sequelize } from './database';

class User extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true,
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
});`
          }
        ]
      };
    }

    // Simulate Prisma documentation
    if (libraryId === '/prisma/prisma') {
      return {
        libraryId,
        topic,
        snippets: [
          {
            title: 'Prisma Schema Definition',
            description: 'Define models in schema.prisma',
            source: 'prisma-docs',
            language: 'prisma',
            code: `model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  profile   Profile?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}`
          }
        ]
      };
    }

    // Default: no documentation found
    return null;
  }
}