package managers;

import models.*;
import models.base.FileOperationException;
import models.enums.LinkType;
import models.services.ElasticsearchService;
import play.db.jpa.JPA;

import javax.inject.Inject;
import java.io.IOException;
import java.util.List;

/**
 * Created by Iven on 16.12.2015.
 */
public class GroupManager implements BaseManager {

    private final ElasticsearchService elasticsearchService;
    private final GroupAccountManager groupAccountManager;
    private final PostManager postManager;
    private final NotificationManager notificationManager;
    private final FolderManager folderManager;
    private final AvatarManager avatarManager;

    @Inject
    public GroupManager(ElasticsearchService elasticsearchService, GroupAccountManager groupAccountManager,
                        PostManager postManager,
                        NotificationManager notificationManager,
                        FolderManager folderManager,
                        AvatarManager avatarManager) {
        this.elasticsearchService = elasticsearchService;
        this.groupAccountManager = groupAccountManager;
        this.postManager = postManager;
        this.notificationManager = notificationManager;
        this.folderManager = folderManager;
        this.avatarManager = avatarManager;

    }

    public void createWithGroupAccount(Group group, Account account) {
        group.owner = account;
        group.rootFolder = new Folder("_"+group.title, account, null, group, null);
        folderManager.create(group.rootFolder);
        create(group);
        groupAccountManager.create(new GroupAccount(group, account, LinkType.establish));
    }

    @Override
    public void create(Object model) {
        JPA.em().persist(model);
    }

    @Override
    public void update(Object model) {
        JPA.em().merge(model);
        try {
            elasticsearchService.index(model);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void delete(Object model) {
        Group group = ((Group) model);

        // delete all Posts
        List<Post> posts = postManager.getPostsForGroup(group, 0, 0);
        for (Post post : posts) {
            postManager.delete(post);
        }

        //delete root folder
        folderManager.delete(group.rootFolder);

        // Delete Notifications
        notificationManager.deleteReferences(group);

        // Delete Elasticsearch document
        elasticsearchService.delete(group);

        JPA.em().remove(group);
    }

    public Group findById(Long id) {
        return JPA.em().find(Group.class, id);
    }

    public static Group findByTitle(String title) {
        List<Group> groups = (List<Group>) JPA.em()
                .createQuery("FROM Group g WHERE g.title = ?1")
                .setParameter(1, title).getResultList();

        if (groups.isEmpty()) {
            return null;
        } else {
            return groups.get(0);
        }
    }

    public List<Group> all() {
        return JPA.em().createQuery("FROM Group").getResultList();
    }

    public List<Group> listAllGroupsOwnedBy(Long id) {
        return JPA.em().createQuery("FROM Group g WHERE g.owner.id = " + id).getResultList();
    }

    /**
     * Returns true, if an account is member of a group.
     *
     * @param group   Group instance
     * @param account Account instance
     * @return True, if account is member of group
     */
    public static boolean isMember(Group group, Account account) {
        @SuppressWarnings("unchecked")
        List<GroupAccount> groupAccounts = (List<GroupAccount>) JPA
                .em()
                .createQuery(
                        "SELECT g FROM GroupAccount g WHERE g.account.id = ?1 and g.group.id = ?2 AND linkType = ?3")
                .setParameter(1, account.id).setParameter(2, group.id)
                .setParameter(3, LinkType.establish).getResultList();

        return !groupAccounts.isEmpty();
    }

    public long indexAllGroups() throws IOException {
        final long start = System.currentTimeMillis();
        for (Group group : all()) elasticsearchService.index(group);
        return (System.currentTimeMillis() - start) / 1000;

    }

    public void saveAvatar(Avatar avatar, Group group) throws FileOperationException {
        avatarManager.saveAvatar(avatar, group.id);
        group.hasAvatar = true;
        this.update(group);
    }
}
