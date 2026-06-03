import { Application, NextFunction, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { createOpenApiDefinition } from '../docs/openapi.definition';

const DOCS_PATH = process.env.SWAGGER_DOCS_PATH || '/api/docs';
const DOCS_JSON_PATH = process.env.SWAGGER_DOCS_JSON_PATH || '/api/docs.json';
const NODE_ENV = process.env.NODE_ENV || 'development';

const isSwaggerEnabled = () => NODE_ENV !== 'production';

const swaggerSpec = swaggerJsdoc({
  failOnErrors: true,
  definition: createOpenApiDefinition(),
  apis: [],
});

const enforceAuthInProduction = (req: Request, res: Response, next: NextFunction) => {
  if (!isSwaggerEnabled()) {
    authenticate(req, res, (authError?: unknown) => {
      if (authError) {
        next(authError);
        return;
      }

      const roleGuard = requireRole('admin');
      roleGuard(req, res, next);
    });
    return;
  }

  next();
};

const setupSwagger = (app: Application) => {
  app.get(DOCS_JSON_PATH, enforceAuthInProduction, (_req: Request, res: Response) => {
    res.status(200).json(swaggerSpec);
  });

  app.use(
    DOCS_PATH,
    enforceAuthInProduction,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'EventForge API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
      },
    })
  );
};

export { setupSwagger, swaggerSpec, DOCS_PATH, DOCS_JSON_PATH };
