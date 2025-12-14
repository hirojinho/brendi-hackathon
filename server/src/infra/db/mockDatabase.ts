// Mock Database implementation to avoid better-sqlite3 dependency issues
export class MockDatabase {
  exec(sql: string): void {
    // Mock implementation - do nothing
  }

  prepare(sql: string): MockStatement {
    return new MockStatement();
  }

  transaction(fn: () => any): any {
    // Mock implementation - just execute the function
    return fn();
  }
}

class MockStatement {
  run(...params: any[]): any {
    return { changes: 1, lastInsertRowid: 1 };
  }

  get(...params: any[]): any {
    return null;
  }

  all(...params: any[]): any[] {
    return [];
  }
}

export default MockDatabase;