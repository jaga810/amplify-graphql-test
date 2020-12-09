import { GraphQLClient } from 'graphql-request';
import { createTodo, updateTodo } from './src/graphql/mutations';
import crypto from 'crypto';
import base64url from 'base64url';

const cognitoJwtGenerator = ({username}) => {
  const header = {
    'alg': 'HS256',
    'typ': 'JWT'
  }

  const payload = {
    'sub': '7d8ca528-4931-4254-9273-ea5ee853f271',
    'cognito:groups': [],
    'email_verified': true,
    'algorithm': 'HS256',
    'iss': 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_fake_idp',
    'phone_number_verified': true,
    'cognito:username': username,
    'cognito:roles': [],
    'aud': '2hifa096b3a24mvm3phskuaqi3',
    'event_id': '18f4067e-9985-4eae-9f33-f45f495470d0',
    'token_use': 'id',
    'phone_number': '+12062062016',
    'exp': 16073469193,
    'email': 'user@domain.com',
    'auth_time': 1586740073,
    'iat': 1586740073
  }

  const encodedHeaderPlusPayload = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));

  const hmac = crypto.createHmac('sha256', 'secretKey')
  hmac.update(encodedHeaderPlusPayload)
  
  return encodedHeaderPlusPayload + '.' + hmac.digest('hex');
}

//2ユーザーからリクエストを行えるよう2つのクライアントを作成
const testUsers = ['user_0', 'user_1'];
const clients = [];

clients.push(new GraphQLClient('http://localhost:20002/graphql', {
  headers: {
    Authorization: cognitoJwtGenerator({username: testUsers[0]})
  },
}));

clients.push(new GraphQLClient('http://localhost:20002/graphql', {
  headers: {
    Authorization: cognitoJwtGenerator({username: testUsers[1]})
  },
}));

describe('Todo Model', () => {
  //[追加部分]必ず失敗するテスト
  test('must fail', () => {
    expect(0).toStrictEqual(1);
  })

  test('Only owner can update their todos', async () => {
    const testTodo = {
      name: 'Test task',
      description: 'This is a test task for unit test',
    };

    // Test用Todoの作成
    const created = await clients[0].request(createTodo, {input: testTodo});

    // Owner自身によるUpdateが成功することを確認
    const updatedName = 'Updated Test Task by user_1';
    const updatedByOwner = await clients[0].request(updateTodo, {input: {id: created.createTodo.id, name: updatedName}});
    expect(updatedByOwner.updateTodo.name).toStrictEqual(updatedName);

    // Owner以外によるUpdateが失敗することを確認
    const updatedByOthers =  clients[1].request(updateTodo, {input: {id: created.createTodo.id, name: ''}});
    await expect(updatedByOthers).rejects.toThrowError('ConditionalCheckFailedException');
  });
});