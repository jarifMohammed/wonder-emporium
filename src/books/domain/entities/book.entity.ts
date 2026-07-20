import { BookStatus } from '../interfaces/book.interface';

export class Book {
  constructor(
    public readonly id: string,
    public readonly authorId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly bookCover: string | null,
    public readonly isbn: string | null,
    public readonly category: string | null,
    public readonly tags: string[],
    public readonly language: string | null,
    public readonly ageGroup: string | null,
    public readonly authorEarnings: number | null,
    public readonly publicationDetails: string | null,
    public readonly status: BookStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly printEdition?: any,
  ) {}

  isDraft(): boolean {
    return this.status === BookStatus.DRAFT;
  }

  isEditable(): boolean {
    return (
      this.status === BookStatus.DRAFT || this.status === BookStatus.REJECTED
    );
  }

  isPendingReview(): boolean {
    return this.status === BookStatus.SUBMITTED;
  }

  isApproved(): boolean {
    return this.status === BookStatus.APPROVED;
  }

  canSubmitForReview(): boolean {
    return this.isEditable();
  }

  canApprove(): boolean {
    return this.status === BookStatus.SUBMITTED;
  }
}
