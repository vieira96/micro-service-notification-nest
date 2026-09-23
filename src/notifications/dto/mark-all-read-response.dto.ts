export class MarkAllReadResponseDto {
  count!: number;

  static fromCount(count: number): MarkAllReadResponseDto {
    const dto = new MarkAllReadResponseDto();
    dto.count = count;
    return dto;
  }
}
