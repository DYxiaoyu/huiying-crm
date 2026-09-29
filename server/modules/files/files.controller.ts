import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = '/app/uploads';
const TRASH_DIR = '/app/uploads/.trash';

function ensureTrash() {
  try { fs.mkdirSync(TRASH_DIR, { recursive: true }); } catch (e) {}
}

function safeName(name: string) {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new BadRequestException('非法文件名');
  }
  return name;
}

@Controller('api/files')
@UseGuards(EmployeeAuthGuard)
export class FilesController {
  @Get('list')
  list(@Query('trash') trash?: string) {
    ensureTrash();
    const dir = trash === '1' ? TRASH_DIR : UPLOAD_DIR;
    const files = fs.readdirSync(dir)
      .filter(f => !f.startsWith('.'))
      .map(f => {
        try {
          const st = fs.statSync(path.join(dir, f));
          return { name: f, size: st.size, mtime: Math.floor(st.mtimeMs) };
        } catch (e) { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.mtime - a.mtime);
    return files;
  }

  @Post('delete')
  delete(@Body('name') name: string) {
    ensureTrash();
    safeName(name);
    try {
      fs.renameSync(path.join(UPLOAD_DIR, name), path.join(TRASH_DIR, name));
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('restore')
  restore(@Body('name') name: string) {
    ensureTrash();
    safeName(name);
    try {
      fs.renameSync(path.join(TRASH_DIR, name), path.join(UPLOAD_DIR, name));
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('permanent')
  permanent(@Body('name') name: string) {
    ensureTrash();
    safeName(name);
    try {
      fs.unlinkSync(path.join(TRASH_DIR, name));
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
