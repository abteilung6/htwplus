package models.services;

import akka.actor.ActorRef;
import akka.actor.ActorSystem;
import com.fasterxml.jackson.databind.node.ObjectNode;
import managers.NotificationManager;
import models.Account;
import models.Notification;
import models.base.BaseNotifiable;
import models.base.INotifiable;
import models.enums.EmailNotifications;
import play.Logger;
import play.db.jpa.JPAApi;
import play.libs.Json;
import scala.concurrent.duration.Duration;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * This class handles the notification system.
 */
@Singleton
public class NotificationService {

    final Logger.ALogger LOG = Logger.of(NotificationService.class);

    WebSocketService webSocketService;
    EmailService email;
    NotificationManager notificationManager;
    ActorSystem system;
    JPAApi jpaApi;

    /**
     * Private constructor for singleton instance
     */
    @Inject
    public NotificationService(EmailService email, NotificationManager notificationManager, JPAApi jpaApi) {
        this.email = email;
        this.webSocketService = webSocketService;
        this.notificationManager = notificationManager;
        this.system = ActorSystem.create();
        this.jpaApi = jpaApi;
    }

    /**
     * Creates one or more notifications by the notifiable instance.
     * The creation is done asynchronized using the Akka subsystem to be non-blocking.
     *
     * @param notifiable Notifiable instance, to retrieve the required notification data
     */
    public void createNotification(final INotifiable notifiable) {
        new Thread(() -> {
            new NotificationRunnable(notifiable).run();
        }).start();
    }

    /**
     * Overloaded method createNotification() with notification type. The notification type
     * is an important information for nearly every notification, as it determines the
     * correct template and eventually also logic in methods like getRecipients() of the
     * notification.
     *
     * @param notifiable Notifiable instance, to retrieve the required notification data
     * @param notificationType Type of this notification
     */
    public void createNotification(INotifiable notifiable, final String notificationType) {
        if (notifiable instanceof BaseNotifiable) {
            ((BaseNotifiable)notifiable).type = notificationType;
        }

        this.createNotification(notifiable);
    }

    /**
     * Sub-Class to implement a Runnable interface for notification creation.
     */
    public class NotificationRunnable implements Runnable {
        private INotifiable notifiable;
        private NotificationRunnable self;

        /**
         * Constructor.
         *
         * @param notifiable Notifiable instance, to retrieve the required notification data
         */
        public NotificationRunnable(final INotifiable notifiable) {
            this.notifiable = notifiable;
            this.self = this;
        }

        @Override
        public void run() {
            jpaApi.withTransaction(() -> {
                List<Account> recipients = notifiable.getRecipients();

                // if no recipients, abort
                if (recipients == null || recipients.size() == 0) {
                    return;
                }

                // run through all recipients
                for (Account recipient : recipients) {
                    // if sender == recipient, it is not necessary to create a notification -> continue
                    if (recipient.equals(notifiable.getSender())) {
                        continue;
                    }

                    // create new notification and persist in database
                    Notification notification = notifiable.getNotification(recipient);
                    notification.isRead = false;
                    notification.isSent = false;
                    notification.recipient = recipient;
                    notification.sender = notifiable.getSender();
                    notification.referenceId = notifiable.getReference().id;
                    notification.referenceType = notifiable.getReference().getClass().getSimpleName();
                    notification.targetUrl = notifiable.getTargetUrl();

                    try {
                        // render notification content
                        notification.rendered = notifiable.render(notification);
                        // if no ID is set already, persist new instance, otherwise update given instance
                        if (notification.id == null) {
                            notificationManager.create(notification);
                            LOG.info("Created new notification for user: " + recipient.id.toString());
                        } else {
                            notificationManager.update(notification);
                            LOG.info("Updated notification (ID: " + notification.id.toString()
                                    + ") for user: " + recipient.id.toString()
                            );
                        }

                        self.webSocketPush(notification);
                        self.handleMail(notification);
                    } catch (Exception e) {
                        LOG.error("Could not render notification. Notification will not be stored in DB" +
                                        " nor will the user be notified in any way." + e.getMessage()
                        );
                    }
                }
            });
        }

        /**
         * Pushes the new notification to the recipient if he is currently online.
         *
         * @param notification Notification
         */
        public void webSocketPush(final Notification notification) {
            /**
            ActorRef recipientActor = webSocketService.getActorForAccount(notification.recipient);

            // continue if recipientActor is instance (he is currently online)
            if (recipientActor != null) {
                ObjectNode node = webSocketService
                        .successResponseTemplate(WebSocketService.WS_METHOD_RECEIVE_NOTIFICATION);
                node.put("notification", notification.getAsJson());
                node.put("unreadCount", notificationManager.countUnreadNotificationsForAccountId(notification.recipient.id));
                recipientActor.tell(Json.toJson(node), null);
            }
            */
        }

        /**
         * Sends mail to recipient, if he wishes to be notified via mail immediately
         * and notification is currently unsent/unread.
         *
         * @param notification Notification
         */
        public void handleMail(final Notification notification) {
            if (notification.recipient.emailNotifications == EmailNotifications.IMMEDIATELY_ALL
                    && !notification.isSent
                    && !notification.isRead
                    ) {
                // since hibernate persist and update contradictions
                // schedule another process for email handling in 1 second from now on
                system.scheduler().scheduleOnce(
                    Duration.create(1, TimeUnit.SECONDS),
                    () -> { email.sendNotificationEmail(notification); },
                    system.dispatcher()
                );
            }
        }
    }
}
