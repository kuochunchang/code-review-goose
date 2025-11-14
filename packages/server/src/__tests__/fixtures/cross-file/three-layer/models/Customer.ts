// Layer 1: Database Model - Customer

export interface CustomerAttributes {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  registeredAt: Date;
}

export class Customer {
  private id: number;
  private name: string;
  private email: string;
  private phoneNumber: string;
  private address: string;
  private registeredAt: Date;
  private isActive: boolean;

  constructor(attributes: CustomerAttributes) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.email = attributes.email;
    this.phoneNumber = attributes.phoneNumber;
    this.address = attributes.address;
    this.registeredAt = attributes.registeredAt;
    this.isActive = true;
  }

  getId(): number {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getPhoneNumber(): string {
    return this.phoneNumber;
  }

  getAddress(): string {
    return this.address;
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  checkIsActive(): boolean {
    return this.isActive;
  }

  updateAddress(newAddress: string): void {
    this.address = newAddress;
  }
}
