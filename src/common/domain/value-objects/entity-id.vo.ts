/**
 * EntityId Value Object
 *
 * Encapsulates the concept of an entity identifier. In our PostgreSQL setup,
 * IDs are UUID strings.
 *
 * Why a Value Object?
 * → Provides compile-time type safety: you can't accidentally pass a
 *   random string where an EntityId is expected.
 * → Centralizes validation: ObjectId format is validated in one place.
 * → Makes refactoring easier: if ID format changes, only this class needs updates.
 *
 * Edge Case: UUIDs from PostgreSQL are exactly 36 characters with hyphens.
 */
export class EntityId {
  private static readonly UUID_REGEX =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

  private constructor(private readonly _value: string) {}

  /**
   * Creates an EntityId from a string value.
   * Validates that the string is a valid MongoDB ObjectId.
   *
   * @throws Error if the value is not a valid ObjectId
   */
  static create(value: string): EntityId {
    if (!value || !EntityId.UUID_REGEX.test(value)) {
      throw new Error(
        `Invalid entity ID format: "${value}". Expected a valid UUID string.`,
      );
    }
    return new EntityId(value);
  }

  /**
   * Creates an EntityId without validation.
   * Use only when the value is guaranteed to be valid (e.g., from database).
   */
  static fromTrusted(value: string): EntityId {
    return new EntityId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: EntityId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
