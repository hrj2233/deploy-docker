import { Injectable } from '@nestjs/common';
import { IFilesServiceUpload } from './interfaces/files-service.interface';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class FilesService {
  async upload({ file }: IFilesServiceUpload): Promise<string> {
    console.log(file);

    // 1. 파일을 클라우드 스토리지에 저장하는 로직

    // 1-1) 스토리지 셋팅하기
    const storage = new Storage({
      projectId: process.env.GCP_FILE_STORAGE_PROJECT_ID,
      keyFilename: process.env.GCP_FILE_STORAGE_KEYFILENAME,
    }).bucket(process.env.GCP_FILE_STORAGE_BUCKET);

    // 1-2) 스토리지에 파일 올리기
    file
      .createReadStream()
      .pipe(storage.file(file.filename).createWriteStream())
      .on('finish', () => {
        console.log('성공');
      })
      .on('error', (error) => {
        console.log(error);
        console.log('실패');
      });

    console.log('파일전송이 완료되었습니다.');

    return '임시작성';
  }
}
