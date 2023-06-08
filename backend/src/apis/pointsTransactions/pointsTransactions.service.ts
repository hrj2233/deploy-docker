// pointsTransactions.service.ts

import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  PointTransaction,
  POINT_TRANSACTION_STATUS_ENUM,
} from './entities/pointTransaction.entity';
import {
  IPointsTransactionsServiceCreateForPayment,
  IPointsTransactionsServiceFindOneByImpUid,
  IPointsTransactionsServiceCheckDuplication,
  IPointsTransactionsServiceFindByImpUidAndUser,
  IPointsTransactionsServiceCancel,
  IPointsTransactionsServiceCheckAlreadyCanceled,
  IPointsTransactionsServiceCheckHasCancelablePoint,
  IPointsTransactionsServiceCreate,
} from './interfaces/points-transactions-service.interface';
import { IamportService } from '../iamport/import.service';

@Injectable()
export class PointsTransactionsService {
  constructor(
    @InjectRepository(PointTransaction)
    private readonly pointsTransactionsRepository: Repository<PointTransaction>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly dataSource: DataSource,

    private readonly iamportService: IamportService,
  ) {}

  findOneByImpUid({
    impUid,
  }: IPointsTransactionsServiceFindOneByImpUid): Promise<PointTransaction> {
    return this.pointsTransactionsRepository.findOne({ where: { impUid } });
  }

  async checkDuplication({
    impUid,
  }: IPointsTransactionsServiceCheckDuplication): Promise<void> {
    const result = await this.findOneByImpUid({ impUid });
    if (result) throw new ConflictException('이미 등록된 결제 아이디입니다.');
  }

  // async create({
  //   impUid,
  //   amount,
  //   user: _user,
  //   status = POINT_TRANSACTION_STATUS_ENUM.PAYMENT,
  // }: IPointsTransactionsServiceCreate): Promise<PointTransaction> {
  //   // 1. PointTransaction 테이블에 거래기록 1줄 생성
  //   const pointTransaction = this.pointsTransactionsRepository.create({
  //     impUid,
  //     amount,
  //     user: _user,
  //     status,
  //   });
  //   await this.pointsTransactionsRepository.save(pointTransaction);

  //   // 2. 유저의 돈 찾아서 업데이트하기   // 숫자일 때 가능 => 숫자가 아니면?? (ex, 좌석 등)? 직접 lock 걸기! (service2 파일 참고)
  //   const user = await this.usersRepository.findOne({
  //     where: { id: _user.id },
  //   });

  //   // 3. 유저의 돈 업데이트하기
  //   await this.usersRepository.update(
  //     { id: _user.id },
  //     { point: user.point + amount },
  //   );

  //   // 3. 최종결과 브라우저에 돌려주기
  //   return pointTransaction;
  // }

  async create({
    impUid,
    amount,
    user: _user,
    status = POINT_TRANSACTION_STATUS_ENUM.PAYMENT,
  }: IPointsTransactionsServiceCreate): Promise<PointTransaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');
    try {
      // 1. PointTransaction 테이블에 거래기록 1줄 생성
      const pointTransaction = this.pointsTransactionsRepository.create({
        impUid,
        amount,
        user: _user,
        status,
      });
      // await this.pointsTransactionsRepository.save(pointTransaction);
      await queryRunner.manager.save(pointTransaction);

      // 2. 유저의 돈 찾아서 업데이트하기   // 숫자일 때 가능 => 숫자가 아니면?? (ex, 좌석 등)? 직접 lock 걸기! (service2 파일 참고)
      const id = _user.id;
      await queryRunner.manager.increment(User, { id }, 'point', amount);
      await queryRunner.commitTransaction();

      // 3. 최종결과 브라우저에 돌려주기
      return pointTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release(); // release가 없으면, commit 끝나도 커넥션이 안끊겨서 문제됨 (하지만, 에러나면 자동끊김)
    }
  }

  async createForPayment({
    impUid,
    amount,
    user,
  }: IPointsTransactionsServiceCreateForPayment): Promise<PointTransaction> {
    // this.pointsTransactionsRepository.create(); // 등록을 위한 빈 객체 만들기
    // this.pointsTransactionsRepository.insert(); // 결과는 못 받는 등록 방법
    // this.pointsTransactionsRepository.update(); // 결과는 못 받는 수정 방법

    await this.iamportService.checkPaid({ impUid, amount }); // 결제완료 상태인지 검증하기
    await this.checkDuplication({ impUid }); // 이미 결제됐던 id인지 검증하기
    return this.create({ impUid, amount, user });
  }

  findByImpUidAndUser({
    impUid,
    user,
  }: IPointsTransactionsServiceFindByImpUidAndUser): Promise<
    PointTransaction[]
  > {
    return this.pointsTransactionsRepository.find({
      where: { impUid, user: { id: user.id } },
      relations: ['user'],
    });
  }

  checkAlreadyCanceled({
    pointTransactions,
  }: IPointsTransactionsServiceCheckAlreadyCanceled): void {
    const canceledPointTransactions = pointTransactions.filter(
      (el) => el.status === POINT_TRANSACTION_STATUS_ENUM.CANCEL,
    );
    if (canceledPointTransactions.length)
      throw new ConflictException('이미 취소된 결제 아이디입니다.');
  }

  checkHasCancelablePoint({
    pointTransactions,
  }: IPointsTransactionsServiceCheckHasCancelablePoint): void {
    const paidPointTransactions = pointTransactions.filter(
      (el) => el.status === POINT_TRANSACTION_STATUS_ENUM.PAYMENT,
    );
    if (!paidPointTransactions.length)
      throw new UnprocessableEntityException('결제 기록이 존재하지 않습니다.');

    if (paidPointTransactions[0].user.point < paidPointTransactions[0].amount)
      throw new UnprocessableEntityException('포인트가 부족합니다.');
  }

  async cancel({
    impUid,
    user,
  }: IPointsTransactionsServiceCancel): Promise<PointTransaction> {
    const pointTransactions = await this.findByImpUidAndUser({ impUid, user }); // 결제내역 조회하기
    this.checkAlreadyCanceled({ pointTransactions }); // 이미 취소됐던 id인지 검증하기
    this.checkHasCancelablePoint({ pointTransactions }); // 포인트가 취소하기에 충분히 있는지 검증하기

    // 결제 취소하기
    const canceledAmount = await this.iamportService.cancel({ impUid });

    // 취소된 결과 등록하기
    return this.create({
      impUid,
      amount: -canceledAmount,
      user,
      status: POINT_TRANSACTION_STATUS_ENUM.CANCEL,
    });
  }
}
