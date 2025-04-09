import { Router } from 'express';

import {
  getAllChats,
  createOrGetAOneOnOneChat,
  createAGroupChat,
  getGroupChatDetails,
  renameGroupChat,
  deleteGroupChat,
  addNewParticipantInGroupChat,
  removeParticipantFromGroupChat,
  leaveGroupChat,
  deleteOneOnOneChat,
  pinMessage,
  unpinMessage,
  deleteChatForMe,
  getChatById,
} from '../controllers/chat.controllers';

const router = Router();

// Chat routes
router.get('/', getAllChats);
router.post('/chat', createOrGetAOneOnOneChat);
router.route('/chat/:chatId').delete(deleteOneOnOneChat).get(getChatById);
router.delete('/chat/:chatId/me', deleteChatForMe);

// Group chat routes
router.post('/group', createAGroupChat);
router
  .route('/group/:chatId')
  .get(getGroupChatDetails)
  .patch(renameGroupChat)
  .delete(deleteGroupChat);

router
  .route('/group/:chatId/participant/:participantId')
  .post(addNewParticipantInGroupChat)
  .delete(removeParticipantFromGroupChat);
router.delete('/group/:chatId/leave', leaveGroupChat);

// Pin/Unpin message routes
router.route('/chat/:chatId/pin/:messageId').post(pinMessage).delete(unpinMessage);

export default router;
