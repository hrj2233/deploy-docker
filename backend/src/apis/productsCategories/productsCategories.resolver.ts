import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ProductCategory } from './entities/productCategory.entity';
import { ProductsCategoriesService } from './productsCategories.service';

@Resolver()
export class ProductsCategoriesResolver {
  constructor(
    private readonly productsCategoriesService: ProductsCategoriesService, //
  ) {}

  @Mutation(() => ProductCategory)
  createProductCategory(
    @Args('name') name: string, //
  ): Promise<ProductCategory> {
    // << 브라우저에 결과 보내는 2가지 방법 >>

    // 1. 저장된 객체 그대로 돌려보내주기 => 프론트엔드 개발자분이 브라우저에 임시저장(캐시) 해놓을 수 있음
    return this.productsCategoriesService.create({ name });

    // 2. 결과메시지만 보내주기
    // return '정상적으로 카테고리가 등록되었습니다.';
  }
}
