export interface BookCreatedPayload {
  bookId: string;
  title: string;
  url: string | null;
  external: boolean;
}
