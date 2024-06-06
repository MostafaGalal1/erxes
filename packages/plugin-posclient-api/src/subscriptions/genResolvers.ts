import * as dotenv from 'dotenv';

dotenv.config();
import orders from './ordersOrdered';
import orderItems from './orderItemsOrdered';
import slots from './slotsStatusUpdated';

export default function genResolvers() {
  const Subscription: any = {
    ...orders,
    ...orderItems,
    ...slots
  };

  return {
    Subscription
  };
}
