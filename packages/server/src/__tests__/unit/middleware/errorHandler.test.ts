import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../../../middleware/errorHandler.js';
import type { Request, Response, NextFunction } from 'express';

describe('errorHandler', () => {
  it('should handle errors and return 500 status', () => {
    const mockError = new Error('Test error message');
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(mockError, mockReq, mockRes, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', mockError);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Test error message',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle errors without message', () => {
    const mockError = new Error();
    mockError.message = '';
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(mockError, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Server error',
    });

    consoleErrorSpy.mockRestore();
  });

  it('should log error to console', () => {
    const mockError = new Error('Logged error');
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(mockError, mockReq, mockRes, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
