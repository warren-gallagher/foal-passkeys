import {
    Entity,
    BaseEntity,
    PrimaryColumn,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
} from 'typeorm';
import { User } from './user.entity';
  
@Entity()
export class Credential extends BaseEntity {
    @PrimaryColumn()
    id: string; // Programmatically set ID.
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @ManyToOne(() => User, user => user.credentials, { onDelete: 'CASCADE' })
    user: User;

    @Column()
    publicKey: string;

    @Column()
    counter: number;

    @Column('simple-array')
    transports: string[];
}