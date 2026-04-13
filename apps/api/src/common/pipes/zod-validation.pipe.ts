import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

interface ZodLike {
  safeParse(value: unknown): { success: boolean; data?: any; error?: { flatten(): { fieldErrors: Record<string, string[]> } } };
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodLike) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      });
    }
    return result.data;
  }
}
