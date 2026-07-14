import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private payments: PaymentsService,
    private config: ConfigService,
  ) {}

  @Post('webhook/clickpesa')
  webhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    const expected = this.config.get('CLICKPESA_WEBHOOK_SECRET');
    if (expected && secret !== expected) {
      return { ok: false, error: 'Invalid secret' };
    }

    return this.payments.handleWebhook({
      reference: body.reference as string | undefined,
      orderId: (body.metadata as { orderId?: string })?.orderId,
      status: String(body.status ?? ''),
      amount: body.amount as number | undefined,
    });
  }

  /** Dev-only: force complete a payment */
  @Post('mock/complete')
  mockComplete(@Body() body: { orderId: string }) {
    if (this.config.get('NODE_ENV') === 'production') {
      return { error: 'Not available in production' };
    }
    return this.payments.completePayment(body.orderId);
  }
}
