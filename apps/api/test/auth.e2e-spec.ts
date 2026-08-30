import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects protected route without token', async () => {
    await request(app.getHttpServer()).get('/api/barangays').expect(401);
  });

  it('rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'superadmin', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects login with short password (validation)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'superadmin', password: 'short' })
      .expect(400);
  });

  it('logs in superadmin and returns roles', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'superadmin', password: 'DemoPass123!' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.roles).toContain('SUPER_ADMIN');
    expect(res.body.user.primaryRole).toBe('SUPER_ADMIN');
  });

  describe('RBAC permission enforcement', () => {
    let superToken: string;
    let tanodToken: string;

    beforeAll(async () => {
      const sup = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'superadmin', password: 'DemoPass123!' })
        .expect(200);
      superToken = sup.body.accessToken;

      const tan = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'tanod1', password: 'DemoPass123!' })
        .expect(200);
      tanodToken = tan.body.accessToken;
    });

    it('superadmin can list barangays', async () => {
      await request(app.getHttpServer())
        .get('/api/barangays')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
    });

    it('superadmin can access audit logs', async () => {
      await request(app.getHttpServer())
        .get('/api/audit')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
    });

    it('tanod cannot view audit logs (forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/audit')
        .set('Authorization', `Bearer ${tanodToken}`)
        .expect(403);
    });

    it('tanod cannot manage users (forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${tanodToken}`)
        .send({})
        .expect(403);
    });

    it('rejects invalid/expired-style token', async () => {
      await request(app.getHttpServer())
        .get('/api/barangays')
        .set('Authorization', 'Bearer invalid.token.value')
        .expect(401);
    });
  });
});
