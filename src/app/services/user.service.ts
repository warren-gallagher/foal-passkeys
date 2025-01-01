import { User } from '../entities';

export class UserService {

    async getById(userId: string) : Promise<User | null> {
        const user = await User.findOneBy({ id: userId });
        if( !user ) {
            return null;
        }
        return user;    
    }
 
    async getByEmail(email: string) : Promise<User | null> {
        const user = await User.findOneBy({ email: email.toLowerCase().trim() });
        if( !user ) {
            return null;
        }
        return user;    
    }
 
    async create(email: string) : Promise<User> {
        const user = new User();
        user.email = email.toLowerCase().trim();
        const createdUser = await user.save();
        return createdUser;
    }

    async update(user: User) : Promise<User> {
        const updatedUser = await user.save();
        return updatedUser;
    }

}