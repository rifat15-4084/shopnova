import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function CheckoutCancelPage() {
  const [params] = useSearchParams();
  const orderNumber = params.get('order');

  return (
    <Container>
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-warning">
          <XCircle className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Payment cancelled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {orderNumber
            ? `Your payment for order ${orderNumber} was not completed. Your cart is still saved.`
            : 'Your payment was not completed. Your cart is still saved.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/cart">
            <Button>Return to cart</Button>
          </Link>
          <Link to="/products">
            <Button variant="outline">Keep shopping</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
