import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@repo/notifications/src/email';

export async function POST(request: NextRequest) {
    try {
        const { template, to, variables } = await request.json();

        if (!template || !to) {
            return NextResponse.json({ error: 'Faltan campos requeridos (template, to)' }, { status: 400 });
        }

        const result = await emailService.sendTemplateEmail(template, to, variables || {});

        if (result.success) {
            return NextResponse.json({ success: true, messageId: result.messageId });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error('Error sending test email:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
