// Profile model

export class Profile {
  private userId: number;
  private bio: string;
  private avatar: string;

  constructor(userId: number, bio: string, avatar: string) {
    this.userId = userId;
    this.bio = bio;
    this.avatar = avatar;
  }

  getUserId(): number {
    return this.userId;
  }

  getBio(): string {
    return this.bio;
  }

  getAvatar(): string {
    return this.avatar;
  }
}
