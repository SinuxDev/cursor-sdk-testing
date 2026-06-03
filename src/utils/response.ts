import { Response } from 'express';

// object covers any JSON-serialisable value while avoiding the broad `any`
type ResponseData = object | string | number | boolean | null;

interface SuccessResponse {
  success: boolean;
  message: string;
  data: ResponseData;
}

export class ApiResponse {
  static success(
    res: Response,
    data: ResponseData = null,
    message: string = 'Request completed successfully',
    statusCode: number = 200
  ): Response {
    const response: SuccessResponse = {
      success: true,
      message,
      data,
    };

    return res.status(statusCode).json(response);
  }

  static created(
    res: Response,
    data: ResponseData = null,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).json({
      success: true,
      message: 'No content',
      data: null,
    });
  }
}
