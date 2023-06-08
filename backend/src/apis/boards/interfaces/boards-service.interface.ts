import { CreateBoardInput } from '../dto/create-board.input';
// import { Board } from '../entities/board.entity';

export interface IBoardsServiceCreate {
  createBoardInput: CreateBoardInput;
}

// implements해서 사용 가능
// export interface BoardsService {
//   findAll(): Board[];
//   create({ createBoardInput }: IBoardsServiceCreate): string;
// }
