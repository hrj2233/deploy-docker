import { InputType, OmitType, PartialType, PickType } from '@nestjs/graphql';
import { CreateProductInput } from './create-product.input';

@InputType()
export class UpdateProductInput extends PartialType(CreateProductInput) {
  // name: string
  // description: string
  // price: number
}

// PickType(CreateProductInput, ['name', 'price']); => 고르기
// OmitType(CreateProductInput, ['description']);   => 빼기
// PartialType(CreateProductInput);                 => 있어도 되고 없어도 됨(nullable)
