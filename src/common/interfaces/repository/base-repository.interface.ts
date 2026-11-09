export interface IBaseRepository<T, CreateDto, UpdateDto> {
  save(data: CreateDto): Promise<T>;
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  update(id: number, data: UpdateDto): Promise<T>;
  remove(id: number): Promise<T>;
}
