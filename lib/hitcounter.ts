import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { TableEncryption } from '@aws-cdk/aws-dynamodb';

export interface HitCounterProps {
  readCapacity? : number;
  /** the function for which we want to count url hits **/
  downstream: lambda.Function;
}

export class HitCounter extends cdk.Construct {
  public readonly handler: lambda.Function;
  public readonly table: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string, props: HitCounterProps) {
    if (props.readCapacity !== undefined && (props.readCapacity < 5 || props.readCapacity > 20)) {
      throw new Error(`readCapacity must be greater than 5 and less than 20 but yours is: ${props.readCapacity}`);
    }

    super(scope, id);

    this.table = new dynamodb.Table(this, 'Hits', {
      partitionKey: { name: 'path', type: dynamodb.AttributeType.STRING },
      encryption: TableEncryption.AWS_MANAGED,
      readCapacity: props.readCapacity || 5
    });

    this.handler = new lambda.Function(this, 'HitCounterHandler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'hitcounter.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
        HITS_TABLE_NAME: this.table.tableName
      }
    });

    // grant the lambda role read/write permissions to our table
    this.table.grantReadWriteData(this.handler);

    // grant the lambda role invoke permissions to the downstream function
    props.downstream.grantInvoke(this.handler);

  }
}
