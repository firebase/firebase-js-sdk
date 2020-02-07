import { Auth } from '../..';
import {
  ActionCodeInfo,
  actionCodeInfoFromResetPasswordResponse
} from '../../model/action_code_info';
import { resetPassword } from '../../api/account_management';

export async function checkActionCode(
  auth: Auth,
  oobCode: string
): Promise<ActionCodeInfo> {
  const response = await resetPassword(auth, {
    oobCode
  });
  return actionCodeInfoFromResetPasswordResponse(auth, response);
}
