import { Router } from 'express';

import {
  getAllMessages,
  sendMessage,
  deleteMessage,
  updateReaction,
  replyMessage,
} from '../controllers/message.controllers';
import { handleUploadErrors } from '../middleware/handleUploadErrors.middleware';
import { upload } from '../middleware/multer.middleware';

const router = Router();

router
  .route('/:chatId')
  .get(getAllMessages)
  .post(upload.fields([{ name: 'attachments', maxCount: 5 }]), handleUploadErrors, sendMessage);

router.route('/:chatId/:messageId').delete(deleteMessage);

router.post('/:chatId/:messageId/reaction', updateReaction);

router.post('/:chatId/:messageId/reply', replyMessage);

export default router;
