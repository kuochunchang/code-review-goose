/**
 * 完整的 OO 關係測試範例
 * 這個檔案展示所有支援的物件導向關係類型
 */

// 外部依賴（用於測試 import 分析）
// import { EventEmitter } from 'events';
// import type { Request, Response } from 'express';

/**
 * 基礎引擎類別（被組合使用）
 */
class Engine {
  private horsepower: number;

  constructor(horsepower: number) {
    this.horsepower = horsepower;
  }

  start(): void {
    console.log('Engine started');
  }
}

/**
 * 輪胎類別（被聚合使用）
 */
class Wheel {
  private size: number;

  constructor(size: number) {
    this.size = size;
  }
}

/**
 * 駕駛類別（被關聯使用）
 */
class Driver {
  private name: string;
  private license: string;

  constructor(name: string, license: string) {
    this.name = name;
    this.license = license;
  }

  getName(): string {
    return this.name;
  }
}

/**
 * 保險類別（方法依賴）
 */
class Insurance {
  private policyNumber: string;
  private coverage: number;

  constructor(policyNumber: string, coverage: number) {
    this.policyNumber = policyNumber;
    this.coverage = coverage;
  }

  getCoverage(): number {
    return this.coverage;
  }
}

/**
 * Logger 服務（依賴注入）
 */
class Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

/**
 * 汽車類別 - 展示所有 OO 關係
 *
 * 關係說明：
 * 1. Composition (組合): Car *-- "1" Engine
 *    - Car 擁有 Engine，Engine 的生命週期由 Car 控制
 *    - private 屬性，實心菱形 ◆
 *
 * 2. Aggregation (聚合): Car o-- "4" Wheel
 *    - Car 使用 Wheels，但 Wheels 可以獨立存在
 *    - public array 屬性，空心菱形 ◇
 *
 * 3. Association (關聯): Car --> "1" Driver
 *    - Car 引用 Driver，但不擁有
 *    - public 單一物件屬性，實線箭頭 →
 *
 * 4. Dependency (依賴): Car ..> Insurance
 *    - Car 的方法使用 Insurance 作為參數或回傳值
 *    - 虛線箭頭 ··>
 *
 * 5. Dependency Injection (注入): Car ..> Logger : <<inject>>
 *    - Car 透過 constructor 注入 Logger
 *    - 特殊標記的依賴關係
 */
class Car {
  // Composition: 私有引擎，生命週期由 Car 控制
  private engine: Engine;

  // Aggregation: 公開的輪胎陣列，輪胎可以獨立存在
  public wheels: Wheel[];

  // Association: 公開的駕駛引用
  public driver: Driver | null;

  // 一般屬性（不是類別類型）
  private brand: string;
  private model: string;
  private year: number;

  /**
   * Dependency Injection: 透過 constructor 注入 Logger
   */
  constructor(
    brand: string,
    model: string,
    year: number,
    horsepower: number,
    private logger: Logger  // Injection
  ) {
    this.brand = brand;
    this.model = model;
    this.year = year;
    this.driver = null;

    // Composition: Engine 在 Car 內部創建
    this.engine = new Engine(horsepower);

    // Aggregation: Wheels 可以從外部傳入或內部創建
    this.wheels = [
      new Wheel(18),
      new Wheel(18),
      new Wheel(18),
      new Wheel(18),
    ];

    this.logger.log(`Car created: ${brand} ${model}`);
  }

  /**
   * Dependency: 方法參數使用 Insurance 類別
   */
  public registerInsurance(insurance: Insurance): void {
    this.logger.log(`Insurance registered: ${insurance.getCoverage()}`);
  }

  /**
   * Dependency: 方法回傳值使用 Insurance 類別
   */
  public getRecommendedInsurance(): Insurance {
    return new Insurance('DEFAULT-001', 100000);
  }

  /**
   * Association: 設定駕駛
   */
  public assignDriver(driver: Driver): void {
    this.driver = driver;
    this.logger.log(`Driver assigned: ${driver.getName()}`);
  }

  public start(): void {
    this.engine.start();
    this.logger.log('Car started');
  }

  public getInfo(): string {
    return `${this.year} ${this.brand} ${this.model}`;
  }
}

/**
 * 電動車類別 - 展示繼承關係
 * Inheritance: ElectricCar --|> Car (實線空心箭頭)
 */
class ElectricCar extends Car {
  private batteryCapacity: number;

  constructor(
    brand: string,
    model: string,
    year: number,
    batteryCapacity: number,
    logger: Logger
  ) {
    super(brand, model, year, 0, logger);
    this.batteryCapacity = batteryCapacity;
  }

  public charge(): void {
    console.log(`Charging battery: ${this.batteryCapacity} kWh`);
  }
}

/**
 * 介面 - 展示介面實作關係
 */
interface Maintainable {
  performMaintenance(): void;
  getMaintenanceStatus(): string;
}

/**
 * 服務站類別 - 實作介面
 * Realization: ServiceStation ..|> Maintainable (虛線空心箭頭)
 */
class ServiceStation implements Maintainable {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  public performMaintenance(): void {
    console.log(`Performing maintenance at ${this.name}`);
  }

  public getMaintenanceStatus(): string {
    return 'All systems OK';
  }

  /**
   * Dependency: 方法使用 Car 作為參數
   */
  public serviceCar(car: Car): void {
    this.performMaintenance();
    console.log(`Servicing: ${car.getInfo()}`);
  }
}

// Export 測試
export { Car, ElectricCar, Engine, Wheel, Driver };
export type { Maintainable };
export default ServiceStation;
