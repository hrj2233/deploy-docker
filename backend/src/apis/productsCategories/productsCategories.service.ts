import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from './entities/productCategory.entity';
import { IProductsCategoriesServiceCreate } from './interfaces/products-categories-service.interface';

@Injectable()
export class ProductsCategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly productsCategoriesRepository: Repository<ProductCategory>,
  ) {}

  create({ name }: IProductsCategoriesServiceCreate): Promise<ProductCategory> {
    // DB에 카테고리 등록
    const result = this.productsCategoriesRepository.save({ name }); // result = { id: asdsadsa, name: '가전제품' }
    return result;
  }
}
