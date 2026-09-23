export class PageResponseDto<T> {
  content!: T[];
  page!: number;
  size!: number;
  totalElements!: number;
  totalPages!: number;
  hasNext!: boolean;

  static from<T>(
    content: T[],
    totalElements: number,
    page: number,
    size: number,
  ): PageResponseDto<T> {
    const dto = new PageResponseDto<T>();
    dto.content = content;
    dto.page = page;
    dto.size = size;
    dto.totalElements = totalElements;
    dto.totalPages = Math.ceil(totalElements / size);
    dto.hasNext = page * size < totalElements;
    return dto;
  }
}
