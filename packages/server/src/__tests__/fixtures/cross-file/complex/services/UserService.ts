// UserService: imports from index (re-export)

import { User, Profile } from '../models';

export class UserService {
  private users: Map<number, User>;
  private profiles: Map<number, Profile>;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
  }

  createUser(id: number, name: string, email: string): User {
    const user = new User(id, name, email);
    this.users.set(id, user);
    return user;
  }

  createProfile(userId: number, bio: string, avatar: string): Profile {
    const profile = new Profile(userId, bio, avatar);
    this.profiles.set(userId, profile);
    return profile;
  }

  getUser(id: number): User | undefined {
    return this.users.get(id);
  }

  getProfile(userId: number): Profile | undefined {
    return this.profiles.get(userId);
  }
}
