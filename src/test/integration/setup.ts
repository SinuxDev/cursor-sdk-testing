import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../utils/mongo-memory';

beforeAll(async () => {
  await connectTestDatabase();
}, 900000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});
