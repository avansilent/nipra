import { NextResponse } from "next/server";
import { markWebhookAdmissionStatus, PublicAdmissionError, verifyRazorpayWebhookSignature } from "../../../../../../lib/admission/payments";

type RazorpayEventPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        method?: string;
        status?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
        status?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature") || "";
    const rawBody = await request.text();

    if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid Razorpay webhook signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as RazorpayEventPayload;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id || "";

    if (!orderId) {
      return NextResponse.json({ ok: true });
    }

    if (payload.event === "payment.captured" || payload.event === "order.paid") {
      await markWebhookAdmissionStatus(orderId, {
        payment_id: paymentEntity?.id || null,
        payment_method: paymentEntity?.method || null,
        status: "paid",
        gateway_response: payload as unknown as Record<string, unknown>,
      });
    }

    if (payload.event === "payment.failed") {
      await markWebhookAdmissionStatus(orderId, {
        payment_method: paymentEntity?.method || null,
        status: "failed",
        gateway_response: payload as unknown as Record<string, unknown>,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PublicAdmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to process Razorpay webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
