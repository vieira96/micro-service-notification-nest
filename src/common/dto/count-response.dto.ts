export class CountResponseDto {
  count!: number;

  static fromCount(count: number): CountResponseDto {
    const dto = new CountResponseDto();
    dto.count = count;
    return dto;
  }
}
