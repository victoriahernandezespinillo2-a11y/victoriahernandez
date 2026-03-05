import 'dotenv/config';
import { reservationNotificationService } from '../lib/services/reservation-notification.service';

async function main() {
    const id = process.argv[2];
    if (!id) {
        console.error('Uso: pnpm exec tsx src/scripts/send-confirmation.ts <reservationId>');
        process.exit(1);
    }

    const result = await reservationNotificationService.sendReservationConfirmation(id);
    console.log(result);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
