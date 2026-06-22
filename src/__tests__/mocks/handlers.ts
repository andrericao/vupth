import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://vupth-backend-ia.onrender.com';

const MOCK_USER = {
  id: 'user-uuid-1',
  email: 'cliente@test.com',
  roles: ['CLIENT'],
  createdAt: '2026-05-09T10:00:00Z',
};

const MOCK_TOKENS = {
  access_token: 'mock-access-token-jwt',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
};

const MOCK_ESTABLISHMENTS = [
  {
    id: 'est-1',
    name: 'Barbearia Top',
    serviceType: 'BARBER',
    isOpen: true,
    serviceItems: [
      { id: 's1', serviceItemType: 'CORTE_MAQUINA', customName: 'Corte Degradê', price: 35.0, estimatedMinutes: 30 },
    ],
  },
  {
    id: 'est-2',
    name: 'Salão Beleza Pura',
    serviceType: 'BEAUTY_SALON',
    isOpen: true,
    serviceItems: [],
  },
];

const MOCK_PROFESSIONALS_WITH_QUEUE = [
  {
    id: 'prof-1',
    name: 'Carlos Silva',
    specialty: 'BARBER',
    isAvailable: true,
    estimatedWaitMinutes: 15,
    attendancesInQueue: [
      { id: 'att-1', position: 1, estimatedWaitMinutes: 15 },
    ],
  },
];

export const handlers = [
  // POST /auth/register — 201
  http.post(`${BASE_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      { id: MOCK_USER.id, email: body.email, created_at: MOCK_USER.createdAt, user_roles: ['CLIENT'] },
      { status: 201 }
    );
  }),

  // POST /auth/login — 200
  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (body.password === 'wrongpassword') {
      return HttpResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user: { ...MOCK_USER, email: body.email },
      tokens: MOCK_TOKENS,
    });
  }),

  // POST /auth/refresh — 200
  http.post(`${BASE_URL}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (!body.refresh_token) {
      return HttpResponse.json(
        { message: 'Refresh token is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
    });
  }),

  // POST /auth/logout — 204
  http.post(`${BASE_URL}/auth/logout`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /establishment — 200
  http.get(`${BASE_URL}/establishment`, () => {
    return HttpResponse.json(MOCK_ESTABLISHMENTS);
  }),

  // GET /establishment/id/:id — 200
  http.get(`${BASE_URL}/establishment/id/:id`, ({ params }) => {
    const found = MOCK_ESTABLISHMENTS.find((e) => e.id === params.id);

    if (!found) {
      return HttpResponse.json(
        { message: 'Establishment not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(found);
  }),

  // GET /establishment/id/:id/professionals-with-queue — 200
  http.get(`${BASE_URL}/establishment/id/:id/professionals-with-queue`, ({ params }) => {
    if (params.id === 'est-1') {
      return HttpResponse.json(MOCK_PROFESSIONALS_WITH_QUEUE);
    }
    return HttpResponse.json([]);
  }),

  // POST /attendances — 201
  http.post(`${BASE_URL}/attendances`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json(
      {
        id: 'att-new-1',
        clientId: MOCK_USER.id,
        professionalId: 'prof-1',
        establishmentId: 'est-1',
        status: 'SCHEDULED',
        scheduledTime: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // PUT /attendances/:id/cancel — 200
  http.put(`${BASE_URL}/attendances/:id/cancel`, ({ request, params }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      id: params.id,
      status: 'CANCELLED',
    });
  }),

  // GET /client-queue/:profId/queue — 200
  http.get(`${BASE_URL}/client-queue/:profId/queue`, () => {
    return HttpResponse.json({
      position: 3,
      estimatedWaitMinutes: 45,
    });
  }),
];
