import { Controller, Get, Render, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller()
export class ViewController {

  @Get('668f8dba359e1fbc0ae9efc9e983eab6.txt')
  wechatVerify(@Res() res: Response) {
    res.type('text/plain').send('ec59ae89a05ec1501e72cc5ac6cf82c382ec0fd6');
  }

  @Get(['/', '*'])
  @Render('index')
  async render(@Req() req: Request): Promise<{ __platform__: string }>  {
    const platformData = (req as unknown as { __platform_data__?: Record<string, unknown> }).__platform_data__ ?? {};
    return {
      __platform__: JSON.stringify(platformData),
    };
  }
}