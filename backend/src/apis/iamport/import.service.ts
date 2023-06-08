import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import axios from 'axios';
import {
  IIamportServiceCancel,
  IIamportServiceCheckPaid,
} from './interfaces/import-service.interface';

@Injectable()
export class IamportService {
  async getToken(): Promise<string> {
    const result = await axios.post(`https://api.iamport.kr/users/getToken`, {
      imp_key: process.env.IMP_KEY,
      imp_secret: process.env.IMP_SECRET,
    });
    return result.data.response.access_token;
  }

  async checkPaid({ impUid, amount }: IIamportServiceCheckPaid): Promise<void> {
    const token = await this.getToken();
    const result = await axios.get(
      `https://api.iamport.kr/payments/${impUid}`,
      { headers: { Authorization: token } },
    );
    if (amount !== result.data.response.amount) {
      throw new UnprocessableEntityException('잘못된 결제 정보입니다.');
    }
  }

  async cancel({ impUid }: IIamportServiceCancel): Promise<number> {
    const token = await this.getToken();

    const result = await axios.post(
      'https://api.iamport.kr/payments/cancel',
      { imp_uid: impUid },
      { headers: { Authorization: token } },
    );
    return result.data.response.cancel_amount;
  }
}
