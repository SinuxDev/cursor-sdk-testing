const PORT = process.env.PORT || '5000';
const API_VERSION = process.env.API_VERSION || 'v1';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

const apiBasePath = `/api/${API_VERSION}`;

export const createOpenApiDefinition = () => {
  return {
    openapi: '3.0.3',
    info: {
      title: 'EventForge Backend API',
      version: '1.0.0',
      description:
        'Interactive API documentation for EventForge backend services (Express + TypeScript + MongoDB).',
    },
    servers: [
      {
        url: SERVER_URL,
        description:
          process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'System health endpoints' },
      { name: 'Auth', description: 'Authentication and profile endpoints' },
      { name: 'Demo Requests', description: 'Public demo request submission' },
      { name: 'Events', description: 'Event creation, publication, and discovery' },
      { name: 'RSVP', description: 'RSVP and ticket management' },
      { name: 'Upload', description: 'File upload and metadata endpoints' },
      { name: 'Admin', description: 'Administrative management endpoints' },
      { name: 'Compliance', description: 'Compliance case management endpoints' },
      { name: 'Admin Email', description: 'Admin email campaign endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste JWT access token obtained from the login endpoint.',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Request completed successfully' },
            data: { nullable: true },
          },
          required: ['success', 'message', 'data'],
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation Error' },
            data: {
              oneOf: [
                { type: 'string', example: 'error' },
                { type: 'array', items: { type: 'object' } },
              ],
            },
          },
          required: ['success', 'message', 'data'],
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            password: { type: 'string', format: 'password', example: 'StrongPass123!' },
            role: { type: 'string', enum: ['attendee', 'organizer'], example: 'attendee' },
          },
          required: ['name', 'email', 'password'],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            password: { type: 'string', format: 'password', example: 'StrongPass123!' },
          },
          required: ['email', 'password'],
        },
        SocialLoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            name: { type: 'string', example: 'Jane Doe' },
            provider: { type: 'string', enum: ['google', 'github'], example: 'google' },
            providerId: { type: 'string', example: 'google-oauth2-id' },
            avatar: { type: 'string', format: 'uri', nullable: true },
          },
          required: ['email', 'name', 'provider', 'providerId'],
        },
        UpgradeRoleRequest: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['attendee', 'organizer'], example: 'organizer' },
          },
          required: ['role'],
        },
        DemoRequestCreate: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            company: { type: 'string', example: 'EventForge Labs' },
            message: { type: 'string', example: 'Need a demo for our team' },
          },
          required: ['name', 'email'],
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/auth/register`]: {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Account created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/auth/login`]: {
        post: {
          tags: ['Auth'],
          summary: 'Login with credentials',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
            401: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiError' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/auth/social`]: {
        post: {
          tags: ['Auth'],
          summary: 'Login or register with social identity',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SocialLoginRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Social login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/auth/me`]: {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Current user retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiError' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/auth/upgrade-role`]: {
        post: {
          tags: ['Auth'],
          summary: 'Upgrade current user role',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpgradeRoleRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Role upgraded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/demo-requests`]: {
        post: {
          tags: ['Demo Requests'],
          summary: 'Create demo request',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DemoRequestCreate' },
              },
            },
          },
          responses: {
            201: {
              description: 'Demo request created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/events/public`]: {
        get: {
          tags: ['Events'],
          summary: 'List public events',
          responses: {
            200: {
              description: 'Public events retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/events/public/{id}`]: {
        get: {
          tags: ['Events'],
          summary: 'Get public event by id',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Public event retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/events/{id}/rsvp`]: {
        post: {
          tags: ['RSVP'],
          summary: 'Submit RSVP for event',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'RSVP submitted',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/rsvps/my`]: {
        get: {
          tags: ['RSVP'],
          summary: 'List current user RSVPs',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'RSVP list retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/rsvps/my/managed`]: {
        get: {
          tags: ['RSVP'],
          summary: 'List managed RSVPs for attendee workspace',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'tab',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['upcoming', 'waitlisted', 'past', 'cancelled', 'all'],
              },
            },
            {
              name: 'search',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            {
              name: 'sort',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['eventStartAsc', 'eventStartDesc', 'createdDesc'],
              },
            },
          ],
          responses: {
            200: {
              description: 'Managed RSVP list retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/upload/single`]: {
        post: {
          tags: ['Upload'],
          summary: 'Upload single file',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                    },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'File uploaded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/admin/users`]: {
        get: {
          tags: ['Admin'],
          summary: 'List and search users (admin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Users retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/admin/compliance/cases`]: {
        get: {
          tags: ['Compliance'],
          summary: 'List compliance cases (admin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Compliance cases retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
      [`${apiBasePath}/admin/email/campaigns`]: {
        get: {
          tags: ['Admin Email'],
          summary: 'List email campaigns (admin only)',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Email campaigns retrieved',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiSuccess' },
                },
              },
            },
          },
        },
      },
    },
  };
};
