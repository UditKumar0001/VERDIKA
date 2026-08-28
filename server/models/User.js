/**
 * User Model
 * Represents system users (underwriters, risk officers, administrators).
 */
export class User {
  constructor({ id, email, passwordHash, role, createdAt }) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role || 'underwriter';
    this.createdAt = createdAt || new Date();
  }

  // Placeholder methods for future DB integration
  static async findByEmail(email) {
    // Placeholder lookup
    return null;
  }

  static async findById(id) {
    // Placeholder lookup
    return null;
  }

  static async create(userData) {
    // Placeholder creation
    return new User({ id: 'mock-user-id', ...userData });
  }
}
