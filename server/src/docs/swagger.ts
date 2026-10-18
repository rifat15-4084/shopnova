import swaggerUi from 'swagger-ui-express';

const securityScheme = {
  bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
};

const ok = (schema: Record<string, unknown>, description = 'Success') => ({
  description,
  content: { 'application/json': { schema } },
});

const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
  },
};

const paginated = (itemRef: string | Record<string, unknown>) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: { $ref: itemRef } },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    pages: { type: 'integer' },
    hasNext: { type: 'boolean' },
    hasPrev: { type: 'boolean' },
  },
});

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShopNova API',
    version: '1.0.0',
    description:
      'REST API for the ShopNova MERN e-commerce platform. All money amounts are computed server-side; authenticate with the access token returned by `/api/auth/login`.',
    license: { name: 'MIT' },
  },
  servers: [
    { url: '/api', description: 'Current host' },
  ],
  components: {
    securitySchemes: securityScheme,
    schemas: {
      Error: errorSchema,
      Pagination: { type: 'object' },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          compareAtPrice: { type: 'number' },
          images: { type: 'array', items: { type: 'string' } },
          brand: { type: 'string' },
          stock: { type: 'integer' },
          ratingAverage: { type: 'number' },
          ratingCount: { type: 'integer' },
          isFeatured: { type: 'boolean' },
          variants: { type: 'array', items: { type: 'object' } },
        },
      },
      Category: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          image: { type: 'string' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          user: { type: 'object' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'object' } },
          subtotal: { type: 'number' },
          itemCount: { type: 'integer' },
          couponCode: { type: 'string', nullable: true },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          orderNumber: { type: 'string' },
          items: { type: 'array', items: { type: 'object' } },
          status: {
            type: 'string',
            enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'],
          },
          paymentMethod: { type: 'string', enum: ['stripe', 'cod', 'bkash'] },
          itemsSubtotal: { type: 'number' },
          shippingCost: { type: 'number' },
          tax: { type: 'number' },
          discount: { type: 'number' },
          total: { type: 'number' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin'] },
        },
      },
      Address: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          phone: { type: 'string', example: '+8801712345678' },
          line1: { type: 'string' },
          city: { type: 'string', description: 'District' },
          region: { type: 'string', description: 'Division' },
          upazila: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string' },
        },
      },
      CouponResult: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          type: { type: 'string', enum: ['percent', 'fixed'] },
          value: { type: 'number' },
          discount: { type: 'number' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: { security: [], summary: 'Health check', responses: { '200': ok({ type: 'object' }) } },
    },
    '/auth/register': {
      post: {
        security: [],
        summary: 'Create an account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '201': ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, accessToken: { type: 'string' } } }),
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        security: [],
        summary: 'Log in (sets refresh cookie)',
        responses: {
          '200': ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' }, accessToken: { type: 'string' } } }),
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: { security: [], summary: 'Rotate tokens using the httpOnly refresh cookie', responses: { '200': ok({ type: 'object' }) } },
    },
    '/auth/logout': { post: { summary: 'Clear refresh cookie', responses: { '200': ok({ type: 'object' }) } } },
    '/auth/me': {
      get: { summary: 'Current user', responses: { '200': ok({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }) } },
      patch: { summary: 'Update profile', responses: { '200': ok({ type: 'object' }) } },
    },
    '/auth/forgot-password': { post: { security: [], summary: 'Request a reset link', responses: { '200': ok({ type: 'object' }) } } },
    '/auth/reset-password': { post: { security: [], summary: 'Reset with token', responses: { '200': ok({ type: 'object' }) } } },
    '/auth/merge-cart': { post: { summary: 'Merge a guest cart after login', responses: { '200': ok({ type: 'object' }) } } },
    '/products': {
      get: {
        security: [],
        summary: 'List products (search, filter, sort, paginate)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'minRating', in: 'query', schema: { type: 'number' } },
          { name: 'inStock', in: 'query', schema: { type: 'boolean' } },
          { name: 'featured', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'price_asc', 'price_desc', 'popular', 'rating'] } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': ok(paginated('#/components/schemas/Product')) },
      },
      post: { summary: 'Create product (admin)', responses: { '201': ok({ type: 'object' }) } },
    },
    '/products/slug/{slug}': {
      get: {
        security: [],
        summary: 'Product by slug (+ related)',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': ok({ type: 'object' }), '404': { description: 'Not found' } },
      },
    },
    '/products/{id}': {
      get: { security: [], summary: 'Product by id (admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } },
      patch: { summary: 'Update product (admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } },
      delete: { summary: 'Archive product (admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } },
    },
    '/products/{productId}/reviews': {
      get: { security: [], summary: 'List reviews', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok(paginated('#/components/schemas/Review')) } },
      post: { summary: 'Create or update own review', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '201': ok({ type: 'object' }) } },
      delete: { summary: 'Delete own review', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } },
    },
    '/categories': {
      get: { security: [], summary: 'List categories', responses: { '200': ok({ type: 'object' }) } },
      post: { summary: 'Create category (admin)', responses: { '201': ok({ type: 'object' }) } },
    },
    '/categories/{id}': {
      patch: { summary: 'Update category (admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } },
      delete: { summary: 'Delete category (admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } },
    },
    '/cart': {
      get: { summary: 'Get server cart (live prices + stock)', responses: { '200': ok({ type: 'object', properties: { cart: { $ref: '#/components/schemas/Cart' } } }) } },
      delete: { summary: 'Empty the cart', responses: { '200': ok({ type: 'object' }) } },
    },
    '/cart/items': {
      post: { summary: 'Add item', responses: { '201': ok({ type: 'object' }) } },
      patch: { summary: 'Update qty (0 removes)', responses: { '200': ok({ type: 'object' }) } },
    },
    '/cart/items/{productId}': {
      delete: { summary: 'Remove item', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'variantId', in: 'query', schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } },
    },
    '/cart/coupon': { post: { summary: 'Apply/remove coupon on the cart', responses: { '200': ok({ type: 'object' }) } } },
    '/checkout/config': { get: { security: [], summary: 'Shipping rules + available payment methods', responses: { '200': ok({ type: 'object' }) } } },
    '/checkout/preview': { get: { summary: 'Server-computed order totals', responses: { '200': ok({ type: 'object' }) } } },
    '/checkout/coupon': { get: { summary: 'Validate a coupon code', responses: { '200': ok({ type: 'object', properties: { coupon: { $ref: '#/components/schemas/CouponResult' } } }) } } },
    '/checkout/session': { post: { summary: 'Create a Stripe Checkout Session', responses: { '201': ok({ type: 'object' }), '400': { description: 'Validation / stock error' } } } },
    '/checkout/order': { post: { summary: 'Place a COD / bKash(stub) order', responses: { '201': ok({ type: 'object' }) } } },
    '/orders': { get: { summary: 'My orders', responses: { '200': ok(paginated('#/components/schemas/Order')) } } },
    '/orders/{id}': { get: { summary: 'Order details (owner/admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } } },
    '/orders/{id}/cancel': { post: { summary: 'Cancel own order', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } } },
    '/orders/{id}/invoice': { get: { summary: 'Printable invoice data', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } } },
    '/account/addresses': {
      get: { summary: 'List addresses', responses: { '200': ok({ type: 'object' }) } },
      post: { summary: 'Add address', responses: { '201': ok({ type: 'object' }) } },
    },
    '/account/wishlist': { get: { summary: 'Wishlist', responses: { '200': ok({ type: 'object' }) } } },
    '/account/wishlist/{productId}/toggle': { post: { summary: 'Toggle wishlist item', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } } },
    '/uploads/images': { post: { summary: 'Upload images (multipart, ≤5MB each)', responses: { '201': ok({ type: 'object' }) } } },
    '/webhooks/stripe': { post: { security: [], summary: 'Stripe webhook (raw body + signature)', responses: { '200': ok({ type: 'object' }) } } },
    '/admin/stats/overview': { get: { summary: 'KPIs, revenue series, status donut, top products, low stock (admin)', responses: { '200': ok({ type: 'object' }) } } },
    '/admin/products': { get: { summary: 'Paginated admin product table (admin)', responses: { '200': ok(paginated('#/components/schemas/Product')) } } },
    '/admin/orders': { get: { summary: 'All orders with filters (admin)', responses: { '200': ok(paginated('#/components/schemas/Order')) } } },
    '/admin/orders/{id}/status': { patch: { summary: 'Change order status + tracking (admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } } },
    '/admin/orders/{id}/refund': { post: { summary: 'Issue refund (admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': ok({ type: 'object' }) } } },
    '/admin/orders/export': { get: { summary: 'CSV export (admin)', responses: { '200': { description: 'text/csv' } } } },
    '/admin/customers': { get: { summary: 'Customers with order stats (admin)', responses: { '200': ok(paginated('#/components/schemas/User')) } } },
    '/admin/coupons': { get: { summary: 'List coupons (admin)', responses: { '200': ok({ type: 'object' }) } } },
    '/admin/reviews': { get: { summary: 'Review moderation queue (admin)', responses: { '200': ok(paginated('#/components/schemas/Review')) } } },
    '/admin/audit': { get: { summary: 'Audit log (admin)', responses: { '200': ok(paginated({ type: 'object' })) } } },
  },
};

export const swaggerOptions = {
  explorer: false,
  customSiteTitle: 'ShopNova API Docs',
  customCss: '.swagger-ui { max-width: 900px; margin: 0 auto; }',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
  },
};

export { swaggerUi };
